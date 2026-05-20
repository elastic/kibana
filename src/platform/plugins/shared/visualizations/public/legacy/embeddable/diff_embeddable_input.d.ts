import type { EmbeddableInput } from './i_embeddable';
export declare const omitGenericEmbeddableInput: <I extends Partial<EmbeddableInput> = Partial<EmbeddableInput>>(input: I) => Omit<I, keyof EmbeddableInput>;
export declare const genericEmbeddableInputIsEqual: (currentInput: Partial<EmbeddableInput>, lastInput: Partial<EmbeddableInput>) => boolean;
