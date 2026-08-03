import type { ValueFormatConfig } from '@kbn/lens-common';
import type { LensApiMetricOperation } from '../../schema/metric_ops';
export declare function fromFormatAPIToLensState(format: LensApiMetricOperation['format']): ValueFormatConfig | undefined;
export declare function fromFormatLensStateToAPI(format: ValueFormatConfig | undefined): LensApiMetricOperation['format'] | undefined;
