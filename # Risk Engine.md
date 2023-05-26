# Risk Engine

RiskScoreService
* get(identifier, [filter])
  -> getRiskScores()
* update(identifier, [filter])
  -> RiskEngine.calculate(filter: [...filter, identifier])

RiskEngine
* calculate([filter])
  -> calculateRiskScores([filter])


WatchlistService
* get(identifiers, [filter])
  -> getWatchlistEntries()
* create(identifier, classification)
  -> createWatchlistEntry()
* delete(identifier)
  -> createWatchlistEntry(deletionEntry)
