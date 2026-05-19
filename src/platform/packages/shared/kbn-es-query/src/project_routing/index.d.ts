/**
 * Project routing configuration for cross-project search (CPS).
 *
 * Used in serverless environments to control whether searches are scoped to a single project or span multiple projects.
 *
 * Examples:
 * - undefined - Search across all projects (default)
 * - '_alias:*' - Search across all projects
 * - '_alias:_origin' - Search only in the current project
 *
 * @public
 */
export type ProjectRouting = string | undefined;
