# RESEARCH ONLY (Track 7.A). Two adoption ledgers over evidence/lever_map.json (Track 7 re-steer):
#  (i)  conservative: anything implemented by Core-lite, dependency facades or the boot manifest is BESPOKE;
#       generic only = unmodified island plugin code (co-location), kit-provided mechanisms, TM seam.
#  (ii) Core-runtime: Core-lite + plugin-agnostic platform-contract facades count generic as the named
#       Core-owned "worker Core" component; app/solution-specific facades and the boot manifest stay bespoke.
# usage: python3 research/t7a/ledgers.py <lever_map.json> <out.json>
import json, re, sys

lm = json.load(open(sys.argv[1]))
rows = [r for r in lm['rows'] if r['status'] != 'stays-on-main']

def provider(r):
    to, mech = r['to'], r['mechanism']
    if r['status'].startswith('gap'):
        return 'gap'
    if r['status'] == 'fenced-main-only':
        return 'core-lite' if not to.startswith('taskManager') else 'facade:taskManager'
    if 'constructed by the real plugin' in mech or 'both ends inside the island' in mech \
            or 'registered by real' in mech or 'empty on both sides' in mech:
        return 'island-plugin'
    if to.startswith('taskManager.registerTaskDefinitions') or 'TM research seam' in mech:
        return 'tm-seam'
    if to.startswith('alerting.captured.'):
        field = to.split('.')[-1]
        if field in ('elasticsearch', 'savedObjects', 'uiSettings', 'executionContext', 'logger'):
            return 'core-lite'
        if field == 'encryptedSavedObjectsClient':
            return 'facade:encryptedSavedObjects'
        if field in ('share',):
            return 'facade:share'
        if field == 'spaceIdToNamespace':
            return 'facade:spaces'
        return 'core-lite'  # config replication
    head = to.split('.')[0]
    if head == 'core':
        return 'core-lite'
    if head in ('taskManager', 'encryptedSavedObjects', 'spaces', 'security', 'licensing', 'features',
                'share', 'maintenanceWindows', 'data', 'dataViews', 'kql'):
        return 'facade:' + head
    return 'core-lite'

PLATFORM_FACADES = {'facade:taskManager', 'facade:encryptedSavedObjects', 'facade:spaces',
                    'facade:security', 'facade:licensing', 'facade:features'}

def ledger(r, mode):
    p = provider(r)
    if p == 'gap':
        return 'gap'
    if p in ('island-plugin', 'tm-seam'):
        return 'generic'
    if mode == 'conservative':
        return 'bespoke'
    if p == 'core-lite' or p in PLATFORM_FACADES:
        return 'generic'
    return 'bespoke'

def summarise(mode):
    uniq = {'generic': 0, 'bespoke': 0, 'gap': 0}
    calls = {'generic': 0, 'bespoke': 0, 'gap': 0}
    for r in rows:
        k = ledger(r, mode)
        uniq[k] += 1
        calls[k] += r['atlasCalls'] or 0
    n, c = len(rows), sum(calls.values())
    return {'unique': uniq, 'unique_generic_fraction': uniq['generic'] / n,
            'calls': calls, 'call_generic_fraction': calls['generic'] / c, 'denominator': n, 'call_denominator': c}

by_provider = {}
for r in rows:
    p = provider(r)
    by_provider.setdefault(p, {'edges': 0, 'calls': 0})
    by_provider[p]['edges'] += 1
    by_provider[p]['calls'] += r['atlasCalls'] or 0

out = {
    'conservative': summarise('conservative'),
    'core_runtime': summarise('core_runtime'),
    'by_provider': by_provider,
    'platform_facades_counted_generic_in_core_runtime': sorted(PLATFORM_FACADES),
    'rows': [{'to': r['to'], 'from': r['from'], 'calls': r['atlasCalls'], 'provider': provider(r),
              'conservative': ledger(r, 'conservative'), 'core_runtime': ledger(r, 'core_runtime')} for r in rows],
}
json.dump(out, open(sys.argv[2], 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'rows'}, indent=1))
