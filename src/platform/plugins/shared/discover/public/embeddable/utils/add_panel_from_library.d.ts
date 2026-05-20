import type { RegistryItem } from '@kbn/embeddable-plugin/public/add_from_library/registry';
type OnAddParams = Parameters<RegistryItem['onAdd']>;
export declare const addPanelFromLibrary: (...params: OnAddParams) => Promise<void>;
export {};
