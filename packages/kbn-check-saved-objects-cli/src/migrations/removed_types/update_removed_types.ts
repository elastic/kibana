/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { jsonToFile } from "../../util/json";
import { REMOVED_TYPES_JSON_PATH } from "./constants";

/**
 * Updates the removed_types.json file by adding new removed types
 */
export async function updateRemovedTypes(removedTypes: string[], currentRemovedTypes: string[], fix: boolean) {
    if (!fix) {
        throw new Error(
            `❌ Removed types detected, but fix flag was not provided. Please run with --fix to update removed_types.json.`
        );
    }

    const allTypes = [...currentRemovedTypes, ...removedTypes].sort();
    await jsonToFile(REMOVED_TYPES_JSON_PATH, allTypes);
}