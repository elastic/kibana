import { AxiosError } from 'axios';

export interface GithubIssue {
  html_url: string;
  number: number;
}

export interface GithubCommit {
  commit: {
    message: string;
  };
  sha: string;
}

export interface GithubSearch<T> {
  items: T[];
}

export type GithubApiError = AxiosError<{
  message: string;
  errors?: Array<{
    resource: string;
    code: string;
    message: string;
  }>;
  documentation_url: string;
}>;
