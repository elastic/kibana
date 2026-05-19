import type { RegistryEntry } from '@kbn/management-settings-section-registry';
import type { CategoryCounts } from './category';
import type { FieldDefinition } from '.';
export interface SettingsTabs {
    [id: string]: {
        name: string;
        fields: FieldDefinition[];
        categoryCounts: CategoryCounts;
        callOutTitle: string;
        callOutText: string;
        sections: RegistryEntry[];
        isSavingEnabled: boolean;
    };
}
