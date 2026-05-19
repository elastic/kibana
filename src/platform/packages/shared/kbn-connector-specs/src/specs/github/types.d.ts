import { z } from '@kbn/zod/v4';
export declare const GetMeInputSchema: z.ZodObject<{}, z.core.$strip>;
export type GetMeInput = z.infer<typeof GetMeInputSchema>;
export declare const ListToolsInputSchema: z.ZodObject<{}, z.core.$strip>;
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;
export declare const SearchCodeInputSchema: z.ZodObject<{
    query: z.ZodString;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    perPage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;
export declare const SearchRepositoriesInputSchema: z.ZodObject<{
    query: z.ZodString;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    perPage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SearchRepositoriesInput = z.infer<typeof SearchRepositoriesInputSchema>;
export declare const SearchIssuesInputSchema: z.ZodObject<{
    query: z.ZodString;
    order: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    sort: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    perPage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SearchIssuesInput = z.infer<typeof SearchIssuesInputSchema>;
export declare const SearchPullRequestsInputSchema: z.ZodObject<{
    query: z.ZodString;
    order: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    sort: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    perPage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SearchPullRequestsInput = z.infer<typeof SearchPullRequestsInputSchema>;
export declare const SearchUsersInputSchema: z.ZodObject<{
    query: z.ZodString;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    perPage: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SearchUsersInput = z.infer<typeof SearchUsersInputSchema>;
export declare const ListIssuesInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    state: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        all: "all";
        closed: "closed";
        open: "open";
    }>>>;
    first: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;
export declare const ListPullRequestsInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    state: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        all: "all";
        closed: "closed";
        open: "open";
    }>>>;
    first: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListPullRequestsInput = z.infer<typeof ListPullRequestsInputSchema>;
export declare const ListCommitsInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    sha: z.ZodOptional<z.ZodString>;
    first: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListCommitsInput = z.infer<typeof ListCommitsInputSchema>;
export declare const ListBranchesInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    first: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListBranchesInput = z.infer<typeof ListBranchesInputSchema>;
export declare const ListReleasesInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    first: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListReleasesInput = z.infer<typeof ListReleasesInputSchema>;
export declare const ListTagsInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    first: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    after: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ListTagsInput = z.infer<typeof ListTagsInputSchema>;
export declare const GetCommitInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    sha: z.ZodString;
}, z.core.$strip>;
export type GetCommitInput = z.infer<typeof GetCommitInputSchema>;
export declare const GetLatestReleaseInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
}, z.core.$strip>;
export type GetLatestReleaseInput = z.infer<typeof GetLatestReleaseInputSchema>;
export declare const PullRequestReadInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    pullNumber: z.ZodNumber;
    method: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        get: "get";
        get_diff: "get_diff";
        get_review_comments: "get_review_comments";
    }>>>;
}, z.core.$strip>;
export type PullRequestReadInput = z.infer<typeof PullRequestReadInputSchema>;
export declare const GetFileContentsInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    path: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GetFileContentsInput = z.infer<typeof GetFileContentsInputSchema>;
export declare const GetIssueInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    issueNumber: z.ZodNumber;
}, z.core.$strip>;
export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;
export declare const GetIssueCommentsInputSchema: z.ZodObject<{
    owner: z.ZodString;
    repo: z.ZodString;
    issueNumber: z.ZodNumber;
}, z.core.$strip>;
export type GetIssueCommentsInput = z.infer<typeof GetIssueCommentsInputSchema>;
export declare const CallToolInputSchema: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
