variable "kibana_endpoint" {
  type        = string
  description = "The endpoint of the Kibana API."
  default     = "http://localhost:5601"
}

variable "kibana_api_key" {
  type        = string
  description = "Kibana API key for authentication. Can also be set via the ELASTICSTACK_Kibana_APIKEY environment variable."
  sensitive   = true
  default     = null
}

variable "kibana_rule_api_endpoint" {
  type        = string
  description = "The API endpoint for creating and managing Kibana alerting rules."
  default     = "/api/alerting/rule"
}

variable "rules_file_path" {
  type        = string
  description = "Path to the YAML file containing the rule definitions."
  default     = "rules.yml"
}
