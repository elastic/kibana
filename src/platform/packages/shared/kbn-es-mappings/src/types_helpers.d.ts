export type UnionKeys<T> = T extends T ? keyof T : never;
export type Exact<T, U> = T extends U ? Exclude<UnionKeys<T>, UnionKeys<U>> extends never ? true : false : false;
export type MissingKeysError<T extends string> = Error & `The following keys are missing from the document fields: ${T}`;
export type WithoutTypeField<T> = Omit<T, 'type'>;
export type PartialWithArrayValues<T> = Partial<{
    [P in keyof T]?: T[P] extends {} ? PartialWithArrayValues<T[P]> | PartialWithArrayValues<T[P]>[] : T[P] | T[P][];
}>;
