import type { Container } from 'inversify';
/**
 * Public setup contract of the DI service.
 * @public
 */
export interface CoreDiServiceSetup {
    /**
     * Get the plugin-scoped container
     */
    getContainer(): Container;
}
/**
 * Public start contract of the DI service.
 * @public
 */
export interface CoreDiServiceStart extends CoreDiServiceSetup {
    /**
     * Fork the current plugin scope
     */
    fork(): Container;
}
