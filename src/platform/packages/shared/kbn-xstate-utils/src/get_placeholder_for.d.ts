type ExtractReturnType<T> = T extends (...args: infer _A) => infer R ? R : never;
export declare const getPlaceholderFor: <ImplementationFactory>(_implementationFactory: ImplementationFactory) => ExtractReturnType<ImplementationFactory>;
export {};
