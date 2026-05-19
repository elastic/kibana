interface HmrContext {
    watch: boolean;
    dist: boolean;
    profile: boolean;
    /** Explicit opt-in/opt-out from CLI flag (--no-hmr → false). undefined = auto. */
    hmrFlag?: boolean;
    /** Value of process.env.KBN_HMR */
    kbnHmrEnv?: string;
}
/**
 * Determine whether HMR should be enabled.
 *
 * HMR is on by default in watch + dev (non-dist, non-profile) mode.
 * The CLI flag (--no-hmr) takes highest priority, followed by the
 * KBN_HMR env var, followed by the auto-detection logic.
 */
export declare const isHmrEnabled: (ctx: HmrContext) => boolean;
export {};
