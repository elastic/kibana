grep -Ril 'esArchiver.load' ./test |  xargs rm
grep -Ril 'esArchiver.load' ./x-pack/test |  xargs rm

# then I just:
git status > deleted.txt
# after this a little "in ide" search and replace and "Bob's Your Uncle"
