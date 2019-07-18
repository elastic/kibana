import { AxiosError, AxiosResponse } from 'axios';

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

// TODO: Make PR to DefinitelyTypes to make AxiosError a generic that takes the error response as T
export interface GithubApiError extends AxiosError {
  response?: AxiosResponse<{
    message: string;
    errors?: {}[];
    documentation_url: string;
  }>;
}
