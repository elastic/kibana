import catAliases from './cat.aliases.json'
import catAllocation from './cat.allocation.json'
import catCount from './cat.count.json'
import catFielddata from './cat.fielddata.json'
import catHealth from './cat.health.json'
import catHelp from './cat.help.json'
import catIndices from './cat.indices.json'
import catMaster from './cat.master.json'
import catNodeattrs from './cat.nodeattrs.json'
import catNodes from './cat.nodes.json'
import catPendingTasks from './cat.pending_tasks.json'
import catPlugins from './cat.plugins.json'
import catRecovery from './cat.recovery.json'
import catRepositories from './cat.repositories.json'
import catSegments from './cat.segments.json'
import catShards from './cat.shards.json'
import catSnapshots from './cat.snapshots.json'
import catTasks from './cat.tasks.json'
import catTemplates from './cat.templates.json'
import catThreadPool from './cat.thread_pool.json'

export function getSpec() {
  return {
    ...catAliases,
    ...catAllocation,
    ...catCount,
    ...catFielddata,
    ...catHealth,
    ...catHelp,
    ...catIndices,
    ...catMaster,
    ...catNodeattrs,
    ...catNodes,
    ...catPendingTasks,
    ...catPlugins,
    ...catRecovery,
    ...catRepositories,
    ...catSegments,
    ...catShards,
    ...catSnapshots,
    ...catTasks,
    ...catTemplates,
    ...catThreadPool
  }
}
