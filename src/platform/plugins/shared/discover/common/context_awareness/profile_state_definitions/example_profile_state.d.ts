import type { RowControlProps } from '@kbn/discover-utils';
import type { EuiPanelProps } from '@elastic/eui';
import type { SerializableRecord } from '@kbn/utility-types';
import type { ProfileStateDefinition } from '../profile_state';
export interface ExampleProfileState extends SerializableRecord {
    timestampColor: string;
    rowControlColor: NonNullable<RowControlProps['color']>;
    boxColor: NonNullable<EuiPanelProps['color']>;
}
export declare const EXAMPLE_PROFILE_STATE_DEFAULTS: ExampleProfileState;
export declare const EXAMPLE_PROFILE_STATE_DEF: ProfileStateDefinition<ExampleProfileState>;
