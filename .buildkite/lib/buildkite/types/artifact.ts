export type Artifact = {
  id: string;
  job_id: string;
  url: string;
  download_url: string;
  state: 'new' | 'error' | 'finished' | 'deleted';
  path: string;
  dirname: string;
  filename: string;
  mime_type: string;
  file_size: number;
  glob_path?: string;
  original_path?: string;
  sha1sum: string;
};
