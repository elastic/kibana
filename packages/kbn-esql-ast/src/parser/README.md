## Comments

### Inter-node comment places

Around colon in source identifier:

```eslq
FROM cluster /* comment */ : index
```

Arounds dots in column identifier:

```eslq
KEEP column /* comment */ . subcolumn
```

Cast expressions:

```eslq
STATS "abc":: /* asdf */ integer
```

Time interface expressions:

```eslq
STATS 1 /* asdf */ DAY
```
