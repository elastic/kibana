/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import chalk from 'chalk';
import path from 'path';

import { Project } from './project';

const projectKey = Symbol('__project');

export function renderProjectsTree(rootPath: string, projects: Map<string, Project>) {
  const projectsTree = buildProjectsTree(rootPath, projects);
  return treeToString(createTreeStructure(projectsTree));
}

interface ITree {
  name?: string;
  children?: ITreeChildren;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ITreeChildren extends Array<ITree> {}

type DirOrProjectName = string | typeof projectKey;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IProjectsTree extends Map<DirOrProjectName, string | IProjectsTree> {}

function treeToString(tree: ITree) {
  return [tree.name].concat(childrenToStrings(tree.children, '')).join('\n');
}

function childrenToStrings(tree: ITreeChildren | undefined, treePrefix: string) {
  if (tree === undefined) {
    return [];
  }

  let strings: string[] = [];
  tree.forEach((node, index) => {
    const isLastNode = tree.length - 1 === index;
    const nodePrefix = isLastNode ? '└── ' : '├── ';
    const childPrefix = isLastNode ? '    ' : '│   ';
    const childrenPrefix = treePrefix + childPrefix;

    strings.push(`${treePrefix}${nodePrefix}${node.name}`);
    strings = strings.concat(childrenToStrings(node.children, childrenPrefix));
  });
  return strings;
}

function createTreeStructure(tree: IProjectsTree): ITree {
  let name: string | undefined;
  const children: ITreeChildren = [];

  for (const [dir, project] of tree.entries()) {
    // This is a leaf node (aka a project)
    if (typeof project === 'string') {
      name = chalk.green(project);
      continue;
    }

    // If there's only one project and the key indicates it's a leaf node, we
    // know that we're at a package folder that contains a package.json, so we
    // "inline it" so we don't get unnecessary levels, i.e. we'll just see
    // `foo` instead of `foo -> foo`.
    if (project.size === 1 && project.has(projectKey)) {
      const projectName = project.get(projectKey)! as string;
      children.push({
        children: [],
        name: dirOrProjectName(dir, projectName),
      });
      continue;
    }

    const subtree = createTreeStructure(project);

    // If the name is specified, we know there's a package at the "root" of the
    // subtree itself.
    if (subtree.name !== undefined) {
      const projectName = subtree.name;

      children.push({
        children: subtree.children,
        name: dirOrProjectName(dir, projectName),
      });
      continue;
    }

    // Special-case whenever we have one child, so we don't get unnecessary
    // folders in the output. E.g. instead of `foo -> bar -> baz` we get
    // `foo/bar/baz` instead.
    if (subtree.children && subtree.children.length === 1) {
      const child = subtree.children[0];
      const newName = chalk.dim(path.join(dir.toString(), child.name!));

      children.push({
        children: child.children,
        name: newName,
      });
      continue;
    }

    children.push({
      children: subtree.children,
      name: chalk.dim(dir.toString()),
    });
  }

  return { name, children };
}

function dirOrProjectName(dir: DirOrProjectName, projectName: string) {
  return dir === projectName
    ? chalk.green(dir)
    : chalk`{dim ${dir.toString()} ({reset.green ${projectName}})}`;
}

function buildProjectsTree(rootPath: string, projects: Map<string, Project>) {
  const tree: IProjectsTree = new Map();

  for (const project of projects.values()) {
    if (rootPath === project.path) {
      tree.set(projectKey, project.name);
    } else {
      const relativeProjectPath = path.relative(rootPath, project.path);
      addProjectToTree(tree, relativeProjectPath.split(path.sep), project);
    }
  }

  return tree;
}

function addProjectToTree(tree: IProjectsTree, pathParts: string[], project: Project) {
  if (pathParts.length === 0) {
    tree.set(projectKey, project.name);
  } else {
    const [currentDir, ...rest] = pathParts;

    if (!tree.has(currentDir)) {
      tree.set(currentDir, new Map());
    }

    const subtree = tree.get(currentDir) as IProjectsTree;
    addProjectToTree(subtree, rest, project);
  }
}
