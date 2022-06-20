export type Agent = {
  id: string;
  url: string;
  web_url: string;
  name: string;
  connection_state: string;
  ip_address: string;
  hostname: string;
  user_agent: string;
  version: string;
  creator?: string | null;
  created_at: string;
  last_job_finished_at?: string | null;
  priority: number;
  meta_data?: null | [string];
};
