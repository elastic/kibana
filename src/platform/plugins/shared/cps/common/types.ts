export interface CPSProject {
  _id: string;
  _alias: string;
  _type: string;
  _organisation: string
  [key: string]: string;
}

export interface ProjectTagsResponse {
  origin: Record<string, CPSProject>;
  linked_projects: Record<string, CPSProject>;
}