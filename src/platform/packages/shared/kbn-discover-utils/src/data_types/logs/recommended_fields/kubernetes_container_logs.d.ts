/**
 * Configuration for Kubernetes Container Logs profile recommended fields
 */
export declare const KUBERNETES_CONTAINER_LOGS_PROFILE: {
    readonly pattern: "logs-kubernetes.container_logs";
    readonly recommendedFields: readonly ["container.image.name", "kubernetes.container.name", "kubernetes.namespace", "kubernetes.node.name", "kubernetes.pod.name", "log.level", "message", "orchestrator.resource.name"];
};
export type KubernetesContainerLogsProfile = typeof KUBERNETES_CONTAINER_LOGS_PROFILE;
