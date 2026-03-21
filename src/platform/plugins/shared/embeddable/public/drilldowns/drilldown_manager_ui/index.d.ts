import type { DrilldownRegistryEntry, HasDrilldowns } from '../types';
import type { DrilldownsManagerDeps } from './state';
export declare function getDrilldownManagerUi(props: HasDrilldowns & Pick<DrilldownsManagerDeps, 'initialRoute' | 'onClose' | 'setupContext' | 'triggers' | 'templates' | 'closeAfterCreate'> & {
    entries: DrilldownRegistryEntry[];
}): Promise<import("react").FunctionComponentElement<DrilldownsManagerDeps>>;
