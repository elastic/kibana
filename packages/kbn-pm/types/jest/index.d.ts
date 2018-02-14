///<reference types="jest"/>

// Workaround for https://github.com/DefinitelyTyped/DefinitelyTyped/issues/17605.
declare namespace jest {
  interface SpyInstance<T> extends Mock<T> {
    mockImplementation(fn: (...args: any[]) => any): SpyInstance<T>;
    mockImplementationOnce(fn: (...args: any[]) => any): SpyInstance<T>;
    mockReturnThis(): SpyInstance<T>;
    mockReturnValue(value: any): SpyInstance<T>;
    mockReturnValueOnce(value: any): SpyInstance<T>;
    mockName(name: string): SpyInstance<T>;
  }
}
