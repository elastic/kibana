type Obj<T> = { [k: string]: T };

export function pick<
  T extends Obj<any>,
  K extends keyof T
>(obj: T, keys: K[]): Pick<T, K> {
  const newObj = keys.reduce((acc, val) => {
    acc[val] = obj[val];
    return acc;
  }, {} as Obj<any>);

  return newObj as Pick<T, K>;
}
