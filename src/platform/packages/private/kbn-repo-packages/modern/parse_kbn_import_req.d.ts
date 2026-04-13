/**
 * Parse an import request to a kbn import request, or undefined
 * if this doesn't represent a kbn import request
 *
 * @param {string} importReq
 * @returns {import('./types').KbnImportReq | undefined}
 */
export function parseKbnImportReq(importReq: string): import("./types").KbnImportReq | undefined;
