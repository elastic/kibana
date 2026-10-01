::::{note}
This connector loads its database driver the first time it is used, which takes additional memory on the {{kib}} instance. It might not work on memory-constrained deployments, such as {{ech}} deployments with a 1 GB {{kib}} instance. For reliable use, run {{kib}} with at least 2 GB of memory.
::::
