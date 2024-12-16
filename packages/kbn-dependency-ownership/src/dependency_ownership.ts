/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RenovatePackageRule, ruleCoversDependency } from './rule';
import { parseConfig } from './parse_config';

type DependencyOwners = string[];

interface GetDependencyOwnershipParams {
  dependency?: string;
  owner?: string;
  missingOwner?: boolean;
}

interface DependenciesByOwner {
  prodDependencies: string[];
  devDependencies: string[];
}

interface DependenciesByOwners {
  prodDependencies: Record<string, string[]>;
  devDependencies: Record<string, string[]>;
}

interface DependenciesUncovered {
  uncoveredProdDependencies: string[];
  uncoveredDevDependencies: string[];
}

interface DependenciesCovered {
  coveredProdDependencies: string[];
  coveredDevDependencies: string[];
}

type DependenciesCoverage = DependenciesUncovered & DependenciesCovered;

interface DependenciesOwnershipReport extends DependenciesCoverage {
  prodDependenciesByOwner: Record<string, string[]>;
  devDependenciesByOwner: Record<string, string[]>;
}

type GetDependencyOwnershipResponse =
  | DependencyOwners
  | DependenciesUncovered
  | DependenciesByOwners
  | DependenciesByOwner
  | DependenciesOwnershipReport;

const normalizeOwnerName = (owner: string): string => {
  return owner.replace('team:', '@elastic/');
};

const getDependencyOwners = (dependency: string): string[] => {
  const { renovateRules } = parseConfig();

  const owners =
    renovateRules.find((rule) => rule.enabled && ruleCoversDependency(rule, dependency))
      ?.reviewers ?? [];

  return owners.map(normalizeOwnerName);
};

const getDependenciesByOwner = (): DependenciesByOwners => {
  const { renovateRules, packageDependencies, packageDevDependencies } = parseConfig();

  const dependenciesByOwner = renovateRules.reduce(
    (acc, rule: RenovatePackageRule) => {
      const { reviewers = [] } = rule;
      const ruleDependencies = packageDependencies.filter((dependency) =>
        ruleCoversDependency(rule, dependency)
      );
      const ruleDevDependencies = packageDevDependencies.filter((dependency) =>
        ruleCoversDependency(rule, dependency)
      );

      for (const owner of reviewers) {
        if (!owner.startsWith('team:')) {
          continue;
        }

        const normalizedOwner = normalizeOwnerName(owner);

        if (!acc.prodDependencies[normalizedOwner]) {
          acc.prodDependencies[normalizedOwner] = [];
        }

        if (!acc.devDependencies[normalizedOwner]) {
          acc.devDependencies[normalizedOwner] = [];
        }

        acc.prodDependencies[normalizedOwner].push(...ruleDependencies);
        acc.devDependencies[normalizedOwner].push(...ruleDevDependencies);
      }

      return acc;
    },
    { prodDependencies: {}, devDependencies: {} } as DependenciesByOwners
  );

  return dependenciesByOwner;
};

const getDependenciesCoverage = (): DependenciesCoverage => {
  const { renovateRules, packageDependencies, packageDevDependencies } = parseConfig();

  const aggregateDependencies = (dependencies: string[]) => {
    return dependencies.reduce(
      (acc, dependency) => {
        const isCovered = renovateRules.some((rule: any) => ruleCoversDependency(rule, dependency));

        if (isCovered) {
          acc.covered.push(dependency);
        } else {
          acc.uncovered.push(dependency);
        }

        return acc;
      },
      { covered: [] as string[], uncovered: [] as string[] }
    );
  };

  const { covered: coveredProdDependencies, uncovered: uncoveredProdDependencies } =
    aggregateDependencies(packageDependencies);

  const { covered: coveredDevDependencies, uncovered: uncoveredDevDependencies } =
    aggregateDependencies(packageDevDependencies);

  return {
    coveredProdDependencies,
    coveredDevDependencies,
    uncoveredProdDependencies,
    uncoveredDevDependencies,
  };
};

export const identifyDependencyOwnership = ({
  dependency,
  owner,
  missingOwner,
}: GetDependencyOwnershipParams): GetDependencyOwnershipResponse => {
  if (owner) {
    const dependenciesByOwner = getDependenciesByOwner();

    const prodDependencies = dependenciesByOwner.prodDependencies[owner] ?? [];
    const devDependencies = dependenciesByOwner.devDependencies[owner] ?? [];

    return {
      prodDependencies,
      devDependencies,
    };
  }

  if (dependency) {
    return getDependencyOwners(dependency);
  }

  const {
    uncoveredDevDependencies,
    uncoveredProdDependencies,
    coveredDevDependencies,
    coveredProdDependencies,
  } = getDependenciesCoverage();

  if (missingOwner) {
    return {
      prodDependencies: uncoveredProdDependencies,
      devDependencies: uncoveredDevDependencies,
    };
  }

  const { prodDependencies: prodDependenciesByOwner, devDependencies: devDependenciesByOwner } =
    getDependenciesByOwner();

  return {
    prodDependenciesByOwner,
    devDependenciesByOwner,
    uncoveredProdDependencies,
    uncoveredDevDependencies,
    coveredDevDependencies,
    coveredProdDependencies,
  };
};
