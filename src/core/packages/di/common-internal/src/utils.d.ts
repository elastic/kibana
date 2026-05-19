import { type BindingActivation, type ServiceIdentifier } from 'inversify';
/** @internal */
export declare function cacheInScope<T>(serviceIdentifier: ServiceIdentifier<T>): BindingActivation<T>;
