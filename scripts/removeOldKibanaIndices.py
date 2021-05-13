import requests

logFile = open('/var/log/probe/KibanaStartup.log', 'w')

res = requests.get('http://localhost:9200/_cat/indices/.kibana_*?s=index')
content = res.content
kibanaIndexNums = []

for indexData in content.split(" "):
   if ".kibana" in indexData:
      kibanaIndexNums.append(indexData)

print >>logFile, "Removing .kibana_1 index and current daily index .kibana_{} from list to delete.".format(kibanaIndexNums[-1])
kibanaIndexNums.remove(".kibana_1")
kibanaIndexNums = kibanaIndexNums[:-1]
print >>logFile, "Deleting .kibana_* indices for: {}".format(kibanaIndexNums)

for index in kibanaIndexNums:
   url = "http://localhost:9200/{}".format(index)
   res = requests.delete(url)
   if res.status_code != 200:
      print >>logFile, "Could not delete {}".format(url)

logFile.close()
