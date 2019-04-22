export type PromiseReturnType<Func> = Func extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
) => Promise<infer Value>
  ? Value
  : Func;
