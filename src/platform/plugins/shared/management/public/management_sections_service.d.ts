import { ManagementSection } from './utils';
import type { SectionsServiceSetup, SectionsServiceStartDeps, DefinedSections, ManagementSectionsStartPrivate } from './types';
declare const getSectionsServiceStartPrivate: import("@kbn/kibana-utils-plugin/public").Get<ManagementSectionsStartPrivate>;
export { getSectionsServiceStartPrivate };
export declare class ManagementSectionsService {
    definedSections: DefinedSections;
    constructor();
    private sections;
    getAllSections: () => ManagementSection[];
    private registerSection;
    setup(): SectionsServiceSetup;
    start({ capabilities }: SectionsServiceStartDeps): {};
}
