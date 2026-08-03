import type { Start as InspectorPublicPluginStart } from '@kbn/inspector-plugin/public';
export declare function useInspector({ inspector }: {
    inspector: InspectorPublicPluginStart;
}): (onClose?: () => void) => void;
