import type { ReactNode } from 'react';
import React from 'react';
import { Embeddable } from './embeddable';
import type { EmbeddableInput, EmbeddableOutput } from './i_embeddable';
export declare const ERROR_EMBEDDABLE_TYPE = "error";
export declare class ErrorEmbeddable extends Embeddable<EmbeddableInput, EmbeddableOutput, ReactNode> {
    readonly type = "error";
    error: Error | string;
    constructor(error: Error | string, input: EmbeddableInput);
    reload(): void;
    render(): React.JSX.Element;
}
