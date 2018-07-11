export interface Repository {
  uri: string;  // Something like "github.com/apache/sqoop"
  name: string;
  org: string;
  url: string;  // clone url
}

export interface NewRepository {
  url: string;  // clone url
}