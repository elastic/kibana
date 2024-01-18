/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Generated from: https://gist.githubusercontent.com/elasticmachine/988b80dae436cafea07d9a4a460a011d/raw/rre.schema.json

/**
 * Backstage entity API version.
 */
export type EntityAPIVersion = string;
/**
 * Backstage entity kind.
 */
export type Kind = string;
export type EntityDescription = string;
/**
 * A Backstage icon name.
 */
export type LinkIcon = string;
/**
 * Link title.
 */
export type Title = string;
/**
 * Arbitrary link type identifier.
 */
export type LinkType = string;
/**
 * URL to the linked object.
 */
export type Url = string;
export type Links = BackstageMetadataLink[];
export type EntityName = string;
/**
 * Optional. Only default is used in practice.
 */
export type BackstageNamespace = string;
/**
 * Tags applied to a Backstage entity.
 */
export type EntityTags = string[];
/**
 * Entity display name for user interfaces.
 */
export type EntityTitle = string;
export type Dependencyof = Array<{
  [k: string]: unknown;
}>;
export type Dependson = Array<{
  [k: string]: unknown;
}>;
export type Implementation =
  | BuildkitePipelineManifest
  | GitHubRepositoryManifest
  | PagerdutyTeamImplementation;
export type Apiversion = 'buildkite.elastic.dev/v1';
export type Kind1 = 'Pipeline';
/**
 * The description of the pipeline, to be shown in Buildkite.
 */
export type Description = string | null;
/**
 * The name of the pipeline, to be shown in Buildkite.
 */
export type Name = string;
export type AllowRebuilds = boolean | null;
export type BranchConfiguration = string | null;
export type CancelIntermediateBuilds = boolean | null;
export type CancelIntermediateBuildsBranchFilter = string | null;
export type CloneMethod = 'ssh' | 'https';
export type ClusterId = string | null;
export type DefaultBranch = string | null;
export type DefaultTimeoutInMinutes = number | null;
export type Description1 = string | null;
export type Env = {
  [k: string]: string;
} | null;
export type MaximumTimeoutInMinutes = number | null;
export type PipelineFile = string | null;
export type BuildBranches = boolean | null;
export type BuildPullRequestForks = boolean | null;
export type BuildPullRequestLabelsChanged = boolean | null;
export type BuildPullRequestReadyForReview = boolean | null;
export type BuildPullRequests = boolean | null;
export type BuildTags = boolean | null;
export type CancelDeletedBranchBuilds = boolean | null;
export type FilterCondition = string | null;
export type FilterEnabled = boolean | null;
export type PrefixPullRequestForkBranchNames = boolean | null;
export type PublishBlockedAsPending = boolean | null;
export type PublishCommitStatus = boolean | null;
export type PublishCommitStatusPerStep = boolean | null;
export type PullRequestBranchFilterConfiguration = string | null;
export type PullRequestBranchFilterEnabled = boolean | null;
export type SeparatePullRequestStatuses = boolean | null;
export type SkipBuildsForExistingCommits = boolean | null;
export type SkipPullRequestBuildsForExistingCommits = boolean | null;
export type TriggerMode = 'code' | 'deployment' | 'fork' | 'none';
/**
 * GitHub repository name (including organization).
 */
export type Repository = string;
export type SkipIntermediateBuilds = boolean | null;
export type SkipIntermediateBuildsBranchFilter = string | null;
export type Tags = string[];
/**
 * Pipeline access level for the team.
 */
export type AccessLevel = AccessLevel1 & AccessLevel3;
export type AccessLevel1 = AccessLevel2;
export type AccessLevel2 = 'READ_ONLY' | 'BUILD_AND_READ' | 'MANAGE_BUILD_AND_READ';
export type AccessLevel3 = string;
export type Apiversion1 = 'github.elastic.dev/v1';
export type Kind2 = 'Repository';
export type Applications = Applications1[] | null;
export type Applications1 = 'renovate';
export type Create = boolean;
export type Description2 = string | null;
export type Repository1 = string;
export type SecurityLevel = 'high' | 'low' | 'test';
export type Role = 'Admin' | 'Maintain' | 'Triage' | 'Read' | 'Write';
export type Template = string | null;
export type Visibility = 'public' | 'private' | 'internal';
export type Apiversion2 = 'pagerduty.elastic.dev/v1';
export type Kind3 = 'Team';
export type Description3 = string | null;
/**
 * Explicit PagerDuty email address for the user, for when it's different to their Backstage email address.
 */
export type PagerdutyEmail = string | null;
/**
 * The supported roles for a PagerDuty user.
 *
 * Refer: https://www.pagerduty.com/resources/learn/user-roles-permissions/
 * Refer: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs/resources/user
 */
export type Role1 =
  | 'admin'
  | 'limited_user'
  | 'manager'
  | 'observer'
  | 'read_only_limited_user'
  | 'read_only_user'
  | 'responder'
  | 'restricted_access'
  | 'user';
/**
 * An email address or Backstage user ID.
 */
export type User = string;
export type Members = TeamMembership[];
export type Name1 = string;
export type Owner = string;
export type System = string;
/**
 * The resource type shown in the Backstage catalog.
 */
export type ResourceType = string;

/**
 * A Real Resource Entity.
 *
 *     This is the complete, top-level structure, based on a Backstage
 *     ``Resource``.
 *
 *     Refer: https://backstage.io/docs/features/software-catalog/descriptor-format#kind-resource
 *
 */
export interface RRE {
  apiVersion: EntityAPIVersion;
  kind: Kind;
  metadata?: EntityMetadata;
  spec: ResourceSpec;
  [k: string]: unknown;
}
/**
 * Backstage entity metadata.
 *
 *     Refer: https://backstage.io/docs/features/software-catalog/descriptor-format#common-to-all-kinds-the-metadata
 *
 */
export interface EntityMetadata {
  annotations?: EntityAnnotations;
  description?: EntityDescription;
  labels?: BackstageEntityLabels;
  links?: Links;
  name: EntityName;
  namespace?: BackstageNamespace;
  tags?: EntityTags;
  title?: EntityTitle;
  [k: string]: unknown;
}
/**
 * Kubernetes-style annotations applied to a Backstage entity.
 */
export interface EntityAnnotations {
  /**
   * This interface was referenced by `EntityAnnotations`'s JSON-Schema definition
   * via the `patternProperty` "^(([a-z0-9]([-a-z0-9]*[a-z0-9])?\.)*[a-z0-9]([-a-z0-9]*[a-z0-9])/)?[a-z0-9A-Z][a-z0-9A-Z_.-]{0,62}$".
   */
  [k: string]: string;
}
/**
 * Labels applied to a Backstage entity.
 *
 *     Refer: https://backstage.io/docs/features/software-catalog/descriptor-format/#labels-optional
 *
 */
export interface BackstageEntityLabels {
  /**
   * This interface was referenced by `BackstageEntityLabels`'s JSON-Schema definition
   * via the `patternProperty` "^(([a-z0-9]([-a-z0-9]*[a-z0-9])?\.)*[a-z0-9]([-a-z0-9]*[a-z0-9])/)?[a-z0-9A-Z][a-z0-9A-Z_.-]{0,62}$".
   */
  [k: string]: string;
}
/**
 * A link to something from a Backstage entity.
 *
 *     Refer: https://backstage.io/docs/features/software-catalog/descriptor-format#links-optional
 *
 */
export interface BackstageMetadataLink {
  icon?: LinkIcon;
  title?: Title;
  type?: LinkType;
  url: Url;
}
/**
 * The `spec` property of a Backstage `Resource`.
 *
 *     Refer: https://backstage.io/docs/features/software-catalog/descriptor-format#kind-resource
 *
 */
export interface ResourceSpec {
  dependencyOf?: Dependencyof;
  dependsOn?: Dependson;
  implementation: Implementation;
  owner: Owner;
  system?: System;
  type: ResourceType;
}
/**
 * A Buildkite pipeline implementation manifest.
 */
export interface BuildkitePipelineManifest {
  apiVersion?: Apiversion;
  kind?: Kind1;
  metadata?: PipelineMetadata;
  spec?: BuildkitePipelineSpec;
}
/**
 * Buildkite pipeline metadata.
 */
export interface PipelineMetadata {
  description?: Description;
  name?: Name;
  [k: string]: unknown;
}
/**
 * The implementation.spec for a Buildkite pipeline.
 */
export interface BuildkitePipelineSpec {
  allow_rebuilds?: AllowRebuilds;
  branch_configuration?: BranchConfiguration;
  cancel_intermediate_builds?: CancelIntermediateBuilds;
  cancel_intermediate_builds_branch_filter?: CancelIntermediateBuildsBranchFilter;
  clone_method?: CloneMethod & string;
  cluster_id?: ClusterId;
  default_branch?: DefaultBranch;
  default_timeout_in_minutes?: DefaultTimeoutInMinutes;
  description?: Description1;
  env?: Env;
  maximum_timeout_in_minutes?: MaximumTimeoutInMinutes;
  pipeline_file?: PipelineFile;
  provider_settings?: ProviderSettings | null;
  repository: Repository;
  schedules?: Schedules;
  skip_intermediate_builds?: SkipIntermediateBuilds;
  skip_intermediate_builds_branch_filter?: SkipIntermediateBuildsBranchFilter;
  tags?: Tags;
  teams?: Teams;
}
/**
 * GitHub "provider" settings for a Buildkite pipeline.
 *
 *     Refer: https://buildkite.com/docs/apis/rest-api/pipelines#provider-settings-properties
 *
 */
export interface ProviderSettings {
  build_branches?: BuildBranches;
  build_pull_request_forks?: BuildPullRequestForks;
  build_pull_request_labels_changed?: BuildPullRequestLabelsChanged;
  build_pull_request_ready_for_review?: BuildPullRequestReadyForReview;
  build_pull_requests?: BuildPullRequests;
  build_tags?: BuildTags;
  cancel_deleted_branch_builds?: CancelDeletedBranchBuilds;
  filter_condition?: FilterCondition;
  filter_enabled?: FilterEnabled;
  prefix_pull_request_fork_branch_names?: PrefixPullRequestForkBranchNames;
  publish_blocked_as_pending?: PublishBlockedAsPending;
  publish_commit_status?: PublishCommitStatus;
  publish_commit_status_per_step?: PublishCommitStatusPerStep;
  pull_request_branch_filter_configuration?: PullRequestBranchFilterConfiguration;
  pull_request_branch_filter_enabled?: PullRequestBranchFilterEnabled;
  separate_pull_request_statuses?: SeparatePullRequestStatuses;
  skip_builds_for_existing_commits?: SkipBuildsForExistingCommits;
  skip_pull_request_builds_for_existing_commits?: SkipPullRequestBuildsForExistingCommits;
  /**
   * The type of GitHub event on which to trigger builds.
   */
  trigger_mode?: TriggerMode | null;
}
export interface Schedules {
  branch?: string;
  cronline?: string;
  message?: string;
  env?: Record<string, string>;
  [k: string]: unknown;
}
export interface Teams {
  [k: string]: Team;
}
export interface Team {
  access_level?: AccessLevel;
}
/**
 * A GitHub repository implementation manifest.
 */
export interface GitHubRepositoryManifest {
  apiVersion?: Apiversion1;
  kind?: Kind2;
  metadata?: Metadata;
  spec: GithubRepositorySpec;
}
/**
 * Arbitrary key/value map of metadata for an Implementation Manifest.
 */
export interface Metadata {
  [k: string]: string;
}
/**
 * The implementation.spec for a GitHub repository.
 */
export interface GithubRepositorySpec {
  applications?: Applications;
  create?: Create;
  description?: Description2;
  properties?: Properties;
  repository: Repository1;
  security_level?: SecurityLevel & string;
  teams?: Teams1;
  template?: Template;
  visibility?: Visibility & string;
}
export interface Properties {
  [k: string]: unknown;
}
export interface Teams1 {
  [k: string]: Team1;
}
export interface Team1 {
  role: Role;
}
/**
 * The ``spec.implementation`` of a Pagerduty team RRE.
 */
export interface PagerdutyTeamImplementation {
  apiVersion?: Apiversion2;
  kind?: Kind3;
  metadata?: Metadata1;
  spec: PagerdutyTeamSpec;
}
/**
 * Arbitrary key/value map of metadata.
 */
export interface Metadata1 {
  [k: string]: string;
}
/**
 * The ``spec.implementation.spec`` of a Pagerduty team RRE.
 */
export interface PagerdutyTeamSpec {
  description?: Description3;
  members?: Members;
  name: Name1;
}
/**
 * Represents a user's membership of a PagerDuty team.
 *
 *     The PagerDuty API represents group membership as single objects, each one
 *     defining the relationship between one user and one team. Thus, this model
 *     does the same. In practice you will need many of these models to compose a
 *     team of people.
 *
 */
export interface TeamMembership {
  pagerduty_email?: PagerdutyEmail;
  role: Role1;
  user: User;
}
