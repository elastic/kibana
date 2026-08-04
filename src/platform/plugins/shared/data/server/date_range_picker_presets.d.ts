import type { UserStorageDefinition } from '@kbn/core-user-storage-common';
import { type StoredPresets } from '@kbn/date-range-picker-presets-common';
export declare const dateRangePickerPresetsStorageDefinition: UserStorageDefinition<StoredPresets>;
export declare const dateRangePickerPresetsUserStorageRegistration: {
    "data:dateRangePicker:presets": UserStorageDefinition<import("@kbn/date-range-picker-presets-common").StoredPresetsV1>;
};
