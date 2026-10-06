import type { BindToFluentSyntax, Container, ServiceIdentifier } from 'inversify';
/**
 * A transient plugin-scoped container that is used to handle interim tasks (e.g. HTTP-request handling).
 * @public
 */
export interface ScopedContainer extends Container {
    /**
     * Similar to `bind` but the binding is exposed to the services outside of the scoped container.
     * @param serviceIdentifier Service identifier to bind and expose.
     */
    expose<T>(serviceIdentifier: ServiceIdentifier<T>): BindToFluentSyntax<T>;
    /**
     * Dispose the container and all of its bindings.
     */
    dispose(): void;
}
/**
 * A transient plugin-scoped container that is used to handle interim tasks (e.g. HTTP-request handling).
 * @public
 */
export declare const Scope: import("../token").ServiceToken<ScopedContainer>;
