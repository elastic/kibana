import { Formats } from './core/formats';
export interface Translation {
    /**
     * Actual translated messages.
     */
    messages: Record<string, string>;
    /**
     * Locale of the translated messages.
     */
    locale?: string;
    /**
     * Set of options to the underlying formatter.
     */
    formats?: Formats;
}
//# sourceMappingURL=translation.d.ts.map