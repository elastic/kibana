import type { Container, GetOptions, OptionalGetOptions, ServiceIdentifier } from 'inversify';
/**
 * The React context to provide the dependency injection container.
 * @public
 */
export declare const Context: import("react").Context<Container | undefined>;
/**
 * The `useContainer` hook is used to retrieve the dependency injection container from the context.
 * @see {@link Container}
 * @public
 */
export declare const useContainer: () => Container | undefined;
/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * @see {@link Container.get}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `get` method.
 * @public
 */
export declare function useService<T>(service: ServiceIdentifier<T>, options?: GetOptions): T;
/**
 * The `useService` hook is used to retrieve a service from the dependency injection container.
 * @see {@link Container.get}
 * @param service The service identifier to resolve.
 * @param options InverisfyJS options to pass to the `get` method.
 * @public
 */
export declare function useService<T>(service: ServiceIdentifier<T>, options: OptionalGetOptions): T | undefined;
