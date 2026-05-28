/**
 * Minimal CLI parser — handles `--flag`, `--flag=value`, `--flag value`,
 * and stops at `--`. Designed for the two runners; not a general-purpose
 * argparser.
 */
export interface CliFlags {
  [k: string]: string | boolean | string[] | undefined;
}

export interface CliSpec {
  flags?: Record<string, { default?: string | boolean; alias?: string }>;
  /** Comma-separated string values that should be split into arrays. */
  arrayFlags?: string[];
  /** Boolean (no-value) flags. */
  booleanFlags?: string[];
}

export const parseArgs = (argv: string[], spec: CliSpec = {}): CliFlags => {
  const out: CliFlags = {};
  const arrayFlags = new Set(spec.arrayFlags ?? []);
  const booleanFlags = new Set(spec.booleanFlags ?? []);

  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === '--') break;
    if (tok === undefined || !tok.startsWith('--')) continue;
    const eqIdx = tok.indexOf('=');
    const key = eqIdx >= 0 ? tok.slice(2, eqIdx) : tok.slice(2);
    if (eqIdx >= 0) {
      const value = tok.slice(eqIdx + 1);
      out[key] = arrayFlags.has(key) ? splitList(value) : value;
      continue;
    }
    if (booleanFlags.has(key)) {
      out[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = arrayFlags.has(key) ? splitList(next) : next;
    i += 1;
  }

  for (const [k, opt] of Object.entries(spec.flags ?? {})) {
    if (out[k] === undefined && opt.default !== undefined) {
      out[k] = opt.default;
    }
  }
  return out;
};

export const splitList = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

export const requireFlag = (flags: CliFlags, name: string): string => {
  const v = flags[name];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`Missing required flag --${name}`);
  }
  return v;
};

export const optionalString = (flags: CliFlags, name: string): string | undefined => {
  const v = flags[name];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
};

export const numberFlag = (flags: CliFlags, name: string, def?: number): number | undefined => {
  const v = flags[name];
  if (typeof v !== 'string' || v.length === 0) return def;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`--${name} must be a number, got "${v}"`);
  return n;
};

export const boolFlag = (flags: CliFlags, name: string, def = false): boolean => {
  const v = flags[name];
  if (v === undefined) return def;
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return def;
};
