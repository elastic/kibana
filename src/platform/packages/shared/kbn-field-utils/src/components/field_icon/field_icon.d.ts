import React from 'react';
import type { FieldIconProps as KbnFieldIconProps } from '@kbn/react-field';
export type FieldIconProps = KbnFieldIconProps;
declare const InnerFieldIcon: React.FC<FieldIconProps>;
export type GenericFieldIcon = typeof InnerFieldIcon;
declare const FieldIcon: GenericFieldIcon;
export default FieldIcon;
