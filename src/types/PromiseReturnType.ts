export type PromiseReturnType<Func> = Func extends (
  ...args: any[]
) => Promise<infer Value>
  ? Value
  : Func;
