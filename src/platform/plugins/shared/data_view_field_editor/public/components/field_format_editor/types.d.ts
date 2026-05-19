import type { ReactNode, ReactText } from 'react';
export type SampleInput = ReactText | ReactText[] | Record<string, ReactText[]> | object;
export interface Sample {
    input: SampleInput;
    output: ReactNode;
}
