import { RepositoryUri } from "./repository";

export interface Document {
  repUri: RepositoryUri;
  path: string;
  content: string;
  qnames: string[];
  language?: string;
  sha1?: string;
}