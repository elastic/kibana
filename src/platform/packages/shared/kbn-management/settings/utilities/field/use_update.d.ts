import type { FieldDefinition, SettingType, OnInputChangeFn } from '@kbn/management-settings-types';
export interface UseUpdateParameters<T extends SettingType> {
    /** The {@link OnInputChangeFn} to invoke. */
    onInputChange: OnInputChangeFn<T>;
    /** The {@link FieldDefinition} to use to create an update. */
    field: Pick<FieldDefinition<T>, 'defaultValue' | 'savedValue'>;
}
/**
 * Hook to provide a standard {@link OnInputChangeFn} that will send an update to the
 * field.
 *
 * @param params The {@link UseUpdateParameters} to use.
 * @returns An {@link OnInputChangeFn} that will send an update to the field.
 */
export declare const useUpdate: <T extends SettingType>(params: UseUpdateParameters<T>) => OnInputChangeFn<T>;
