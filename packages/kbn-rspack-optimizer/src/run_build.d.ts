import type { ToolingLog } from '@kbn/tooling-log';
import type { ThemeTag } from './types';
export declare const IGNORED_WATCH_PATTERNS: RegExp[];
export interface BuildOptions {
    repoRoot: string;
    outputRoot?: string;
    dist?: boolean;
    watch?: boolean;
    cache?: boolean;
    examples?: boolean;
    testPlugins?: boolean;
    themeTags?: ThemeTag[];
    log?: ToolingLog;
    /** Enable profiling - writes stats.json and RsDoctor report */
    profile?: boolean;
    /** Skip RsDoctor, only generate stats.json (faster) */
    profileStatsOnly?: boolean;
    /** Comma-separated plugin IDs for focused stats.json with module-level detail (requires profile) */
    profileFocus?: string[];
    /** Enable Hot Module Replacement in watch mode (undefined = auto-detect) */
    hmr?: boolean;
    /** Dev server base path (e.g. "/abc") for HMR auto-reload on server restart */
    basePath?: string;
    /** Override the limits.yml path (default: packages/kbn-rspack-optimizer/limits.yml) */
    limitsPath?: string;
}
export interface BuildResult {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    duration?: number;
    entryCount?: number;
    totalSize?: number;
    /** Function to close the watcher (only set in watch mode) */
    close?: () => Promise<void>;
    /** Resolves when the watcher closes (watch mode only) */
    done?: Promise<void>;
    /** True if build was interrupted by SIGINT/SIGTERM */
    interrupted?: boolean;
}
/**
 * Run RSPack build using a single unified compilation for all plugins.
 *
 * - All plugins built in one RSPack run
 * - Shared dependencies parsed only once
 * - Better chunk optimization
 * - Compatible with external plugin builds
 */
export declare function runBuild(options: BuildOptions): Promise<BuildResult>;
export declare function formatSize(bytes: number): string;
