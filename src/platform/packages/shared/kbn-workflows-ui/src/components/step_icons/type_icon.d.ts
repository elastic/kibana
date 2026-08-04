import type { EuiIconProps } from '@elastic/eui';
import React from 'react';
export interface TypeIconProps extends Omit<EuiIconProps, 'type'> {
    /** The catalog `stepTypes[n]` or `triggerTypes[n]` value (e.g. `abuseipdb.checkIp`, `manual`). */
    type: string;
    kind: 'step' | 'trigger';
}
export declare const TypeIcon: React.NamedExoticComponent<TypeIconProps>;
