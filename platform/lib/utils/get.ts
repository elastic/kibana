/**
 * Retrieve the value for the specified path
 *
 * Note that dot is _not_ allowed to specify a deeper key, it will assume that
 * the dot is part of the key itself.
 */
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B],
  D extends keyof CFG[A][B][C],
  E extends keyof CFG[A][B][C][D]
>(obj: CFG, path: [A, B, C, D, E]): CFG[A][B][C][D][E];
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B],
  D extends keyof CFG[A][B][C]
>(obj: CFG, path: [A, B, C, D]): CFG[A][B][C][D];
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A],
  C extends keyof CFG[A][B]
>(obj: CFG, path: [A, B, C]): CFG[A][B][C];
export function get<
  CFG extends { [k: string]: any },
  A extends keyof CFG,
  B extends keyof CFG[A]
>(obj: CFG, path: [A, B]): CFG[A][B];
export function get<CFG extends { [k: string]: any }, A extends keyof CFG>(
  obj: CFG,
  path: [A]
): CFG[A];
export function get<CFG extends { [k: string]: any }, A extends keyof CFG>(
  obj: CFG,
  path: A
): CFG[A];
export function get<CFG extends { [k: string]: any }>(
  obj: CFG,
  path: Array<string> | string
): any {
  if (typeof path === 'string') {
    if (path.includes('.')) {
      throw new Error(
        'Using dots in `get` with a string is not allowed, use array instead'
      );
    }

    return obj[path];
  }

  for (let key of path) {
    obj = obj[key];
  }

  return obj;
}
