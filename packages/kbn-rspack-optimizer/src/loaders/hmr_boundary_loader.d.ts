/**
 * The loader entry point. Receives SWC-compiled JavaScript.
 * Appends HMR accept boundary for files containing React components.
 */
export default function hmrBoundaryLoader(this: any, source: string): string;
