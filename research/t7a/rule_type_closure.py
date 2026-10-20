# RESEARCH ONLY (Track 7.A). Sizes what it takes to run ALL registered rule types off-main via island
# placement: registrant plugin per rule type (source grep), its transitive requiredPlugins closure
# (kibana.jsonc), and a code-size proxy (server+common TS/JS files and LOC, tests excluded).
# usage: python3 research/t7a/rule_type_closure.py <main_rule_types.json> <out.json>
import json, os, re, subprocess, sys

ROOT = os.getcwd()
rule_types = json.load(open(sys.argv[1]))
out_path = sys.argv[2]
ISLAND = {'alerting', 'actions', 'stackAlerts', 'stackConnectors', 'eventLog'}

def jsonc(path):
    t = open(path).read()
    t = re.sub(r'(?m)^\s*//.*$', '', t)
    t = re.sub(r',(\s*[}\]])', r'\1', t)
    return json.loads(t)

plugins = {}
for base in ('src', 'x-pack'):
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in ('node_modules', 'target', 'build', '.es', 'public', 'test', 'scripts')]
        if 'kibana.jsonc' in filenames:
            try:
                j = jsonc(os.path.join(dirpath, 'kibana.jsonc'))
            except Exception:
                continue
            p = j.get('plugin')
            if j.get('type') == 'plugin' and p and p.get('server', True):
                plugins[p['id']] = {
                    'dir': dirpath,
                    'required': p.get('requiredPlugins') or [],
                    'owner': j.get('owner'),
                }

def code_size(d):
    files = loc = 0
    for sub in ('server', 'common'):
        for dirpath, dirnames, filenames in os.walk(os.path.join(d, sub)):
            dirnames[:] = [x for x in dirnames if x not in ('__mocks__', 'test', 'tests', '__fixtures__', 'integration_tests')]
            for f in filenames:
                if re.search(r'\.(ts|js)$', f) and not re.search(r'(\.test|\.mock|mocks?)\.(ts|js)$', f):
                    files += 1
                    try:
                        loc += sum(1 for _ in open(os.path.join(dirpath, f), errors='ignore'))
                    except Exception:
                        pass
    return files, loc

def closure(pid, seen=None):
    seen = set() if seen is None else seen
    if pid in seen or pid not in plugins:
        return seen
    seen.add(pid)
    for dep in plugins[pid]['required']:
        closure(dep, seen)
    return seen

def plugin_of(path):
    d = os.path.dirname(path)
    while d and d != '.':
        if os.path.exists(os.path.join(d, 'kibana.jsonc')):
            for pid, p in plugins.items():
                if os.path.normpath(p['dir']) == os.path.normpath(d):
                    return pid
            return None
        d = os.path.dirname(d)
    return None

# Registrant by rule-type id (verified: each plugin's server/ contains registerType calls; ids are
# shared constants so plain grep is ambiguous).
RULES = [
    (r'^monitoring_', 'monitoring'), (r'^siem\.', 'securitySolution'), (r'^attack-discovery$', 'elasticAssistant'),
    (r'^apm\.', 'apm'), (r'^metrics\.alert\.', 'infra'), (r'^logs\.alert\.', 'infra'),
    (r'^xpack\.ml\.', 'ml'), (r'^observability\.rules\.', 'observability'), (r'^slo\.', 'slo'),
    (r'^datasetQuality\.', 'datasetQuality'), (r'^transform_health$', 'transform'),
    (r'^xpack\.synthetics\.', 'synthetics'), (r'^xpack\.uptime\.', 'uptime'),
    (r'^\.(es-query|index-threshold|geo-containment)$', 'stackAlerts'),
]
def registrant(rid):
    for pat, pid in RULES:
        if re.search(pat, rid):
            return pid
    return None

registrants = {}
for r in []:
    rid = r['id']
    res = subprocess.run(
        ['rg', '-l', '--type', 'ts', '-F', f"'{rid}'", 'x-pack', 'src', '-g', '!**/public/**', '-g', '!**/*.test.ts', '-g', '!**/test/**', '-g', '!**/mocks/**', '-g', '!**/cypress/**', '-g', '!**/target/**'],
        capture_output=True, text=True,
    )
    files = [f for f in res.stdout.splitlines() if '/server/' in f or '/common/' in f]
    owners = sorted({p for p in (plugin_of(f) for f in files) if p})
    # prefer a plugin whose server code contains the id; producer as tiebreak hint
    registrants[rid] = {'producer': r['producer'], 'candidates': owners}

sizes = {}
summary = []
union_all = set(ISLAND)
for r in rule_types:
    rid = r['id']
    info = {'producer': r['producer'], 'candidates': []}
    reg = registrant(rid)
    cl = closure(reg) if reg else set()
    extra = sorted(cl - ISLAND)
    union_all |= cl
    summary.append({'rule_type': rid, 'producer': info['producer'], 'registrant_guess': reg, 'candidates': info['candidates'], 'closure_plugins': len(cl), 'closure_outside_island': len(extra)})

for pid in union_all:
    if pid in plugins:
        sizes[pid] = code_size(plugins[pid]['dir'])

by_reg = {}
for s in summary:
    by_reg.setdefault(s['registrant_guess'], []).append(s['rule_type'])
reg_rows = []
for reg, rts in sorted(by_reg.items(), key=lambda kv: -len(kv[1])):
    cl = closure(reg) if reg else set()
    extra = cl - ISLAND
    f = sum(sizes.get(p, (0, 0))[0] for p in extra)
    l = sum(sizes.get(p, (0, 0))[1] for p in extra)
    reg_rows.append({'registrant': reg, 'owner': plugins.get(reg, {}).get('owner'), 'rule_types': len(rts), 'closure_plugins_total': len(cl), 'closure_plugins_outside_island': len(extra), 'outside_files': f, 'outside_loc': l})

island_files = sum(sizes.get(p, (0, 0))[0] for p in ISLAND)
island_loc = sum(sizes.get(p, (0, 0))[1] for p in ISLAND)
all_extra = union_all - ISLAND
result = {
    'rule_types': len(rule_types),
    'plugins_indexed': len(plugins),
    'island': {'plugins': sorted(ISLAND), 'files': island_files, 'loc': island_loc},
    'all_46_union_closure': {'plugins': len(union_all), 'outside_island': len(all_extra), 'outside_files': sum(sizes.get(p, (0, 0))[0] for p in all_extra), 'outside_loc': sum(sizes.get(p, (0, 0))[1] for p in all_extra), 'outside_plugin_ids': sorted(all_extra)},
    'by_registrant': reg_rows,
    'rule_types_detail': summary,
}
json.dump(result, open(out_path, 'w'), indent=1)
print(json.dumps({k: v for k, v in result.items() if k not in ('rule_types_detail',)}, indent=1)[:6000])
