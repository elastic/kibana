import path from 'path';
import chalk from 'chalk';

import { Project } from './project';

const projectKey = Symbol('__project');

export function renderProjectsTree(
  rootPath: string,
  projects: Map<string, Project>
) {
  const projectsTree = buildProjectsTree(rootPath, projects);
  return treeToString(createTreeStructure(projectsTree));
}

type Tree = {
  name?: string;
  children?: TreeChildren;
};
interface TreeChildren extends Array<Tree> {}

type DirOrProjectName = string | typeof projectKey;
type ProjectsTree = Map<DirOrProjectName, ProjectsTreeValue | string>;
interface ProjectsTreeValue extends ProjectsTree {}

function treeToString(tree: Tree) {
  return [tree.name].concat(childrenToString(tree.children, '')).join('\n');
}

function childrenToString(tree: TreeChildren | undefined, treePrefix: string) {
  if (tree === undefined) {
    return [];
  }

  let string: string[] = [];
  tree.forEach((node, index) => {
    const isLastNode = tree.length - 1 === index;
    const nodePrefix = isLastNode ? '└── ' : '├── ';
    const childPrefix = isLastNode ? '    ' : '│   ';
    const childrenPrefix = treePrefix + childPrefix;

    string.push(`${treePrefix}${nodePrefix}${node.name}`);
    string = string.concat(childrenToString(node.children, childrenPrefix));
  });
  return string;
}

function createTreeStructure(tree: ProjectsTree): Tree {
  let name: string | undefined;
  const children: TreeChildren = [];

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
        name: dirOrProjectName(dir, projectName),
        children: [],
      });
      continue;
    }

    const subtree = createTreeStructure(project);

    // If the name is specified, we know there's a package at the "root" of the
    // subtree itself.
    if (subtree.name !== undefined) {
      const projectName = subtree.name;

      children.push({
        name: dirOrProjectName(dir, projectName),
        children: subtree.children,
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
        name: newName,
        children: child.children,
      });
      continue;
    }

    children.push({
      name: chalk.dim(dir.toString()),
      children: subtree.children,
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
  const tree: ProjectsTree = new Map();

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

function addProjectToTree(
  tree: ProjectsTree,
  pathParts: string[],
  project: Project
) {
  if (pathParts.length === 0) {
    tree.set(projectKey, project.name);
  } else {
    const [currentDir, ...rest] = pathParts;

    if (!tree.has(currentDir)) {
      tree.set(currentDir, new Map());
    }

    const subtree = tree.get(currentDir) as ProjectsTree;
    addProjectToTree(subtree, rest, project);
  }
}
