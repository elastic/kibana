/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from "react";
import { BaseVisType } from "./base_vis_type";
import { TypesStart } from "./types_service";

export function useVisTypes(visTypesRegistry: TypesStart) {
  const [isLoading, setIsLoading] = useState(false);
  const [ visTypes, setVisTypes ] = useState<BaseVisType[]>([]);
  useEffect(() => {
    let canceled = false;
    setIsLoading(true);
    visTypesRegistry.all()
      .then(types => {
        if (!canceled) {
          setIsLoading(false);
          setVisTypes(types);
        }
      })
      .catch(error => {
        if (!canceled) {
          setIsLoading(false);
          setVisTypes([]);
        }
      });

    return () => {
      canceled = true;
    }
  }, [visTypesRegistry]);

  return {
    isLoading,
    visTypes,
  }
}