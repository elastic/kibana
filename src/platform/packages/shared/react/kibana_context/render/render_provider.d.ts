import type { FC, PropsWithChildren } from 'react';
import { type KibanaRootContextProviderProps } from '@kbn/react-kibana-context-root';
/** Props for the KibanaContextProvider */
export type KibanaRenderContextProviderProps = Omit<KibanaRootContextProviderProps, 'globalStyles'>;
/**
 * The `KibanaRenderContextProvider` provides the necessary context for an out-of-current React render, such as using `ReactDOM.render()`.
 *
/**
 * @internal Use RenderingService.addContext from the CoreStart contract instead of consuming this directly.
 * @deprecated
 */
export declare const KibanaRenderContextProvider: FC<PropsWithChildren<KibanaRenderContextProviderProps>>;
