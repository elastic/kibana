import * as React from 'react';
export type Format = 'encoded' | 'beats' | 'logstash';
export interface FormatSelectProps {
    value: Format;
    onChange: (value: Format) => void;
}
export declare const FormatSelect: React.FC<FormatSelectProps>;
